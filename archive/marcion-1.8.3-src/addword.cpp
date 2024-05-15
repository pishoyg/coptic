/*  Marcion
    Copyright (C) 2009-2016 Milan Konvicka

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along
    with this program; if not, write to the Free Software Foundation, Inc.,
    51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA. */

#include "addword.h"
#include "ui_addword.h"
//

unsigned int CAddWord::count=0;

CAddWord::CAddWord( CMessages * const messages,
    /*QComboBox *const* crum,*/
	int key,
        Mode mode)
        : QWidget(0),
          ui(new Ui::frmAddWord),
          messages(messages),
    /*crum(crum),*/_key(key),_mode(mode),
        dd()
{
    ui->setupUi(this);

        QString wtit;
        switch(mode)
        {
            case InsertWord :
            {
                wtit=tr("Insert Word");
                break;
            }
            case UpdateWord :
            {
                wtit=tr("Update Word");
                break;
            }
            case InsertDeriv :
            {
                wtit=tr("Insert Derivation");
                break;
            }
            case UpdateDeriv :
            {
                wtit=tr("Update Derivation");
                break;
            }
        }

        setWindowTitle(wtit+" ("+QString::number(++count)+")");
        dd.setWindowTitle(windowTitle()+tr(" / edit"));
        //dmdiw.setWidget(&dd);
        //messages->settings().mdiArea()->addSubWindow(&dmdiw)->setWindowIcon(QIcon(":/new/icons/icons/addw.png"));

	QFont font(messages->settings().copticFont());
	font.setPointSize(messages->settings().copticFontSize());

    dd.setFont(font);
    dd.setCoptic();

	QFont cf(messages->settings().copticFont());
	cf.setPointSize(messages->settings().copticFontSize());

    ui->txtAWcoptTr->setFont(cf);
    ui->txtAWgrTr->setFont(cf);

	for(int x=0;x<=COUNT_QUALITY;x++)
        ui->cmbAWquality->addItem(QString(get_quality_item(x).t),QVariant(get_quality_item(x).n));
        for(int x=0;x<CTranslit::CWClass.count();x++)
                ui->cmbAWtype->addItem(CTranslit::CWClass.at(x).first,QVariant(CTranslit::CWClass.at(x).second));

        connect(&dd,SIGNAL(finished(int)),this,SLOT(ddialog_finished(int)));

    switch(_mode)
    {
            case InsertDeriv :
            {
                    ui->rbNewW->setVisible(false);
                    ui->cmbAWquality->setVisible(false);
                    ui->lblQuality->setVisible(false);
            }
            case InsertWord :
            {
                    ui->cbUpdQual->setVisible(false);
                    ui->cbUpdType->setVisible(false);
                    ui->cbUpdCrum->setVisible(false);
                    ui->cbUpdEn->setVisible(false);
                    ui->cbUpdGr->setVisible(false);
                    ui->cbUpdCz->setVisible(false);
                    ui->cbUpdCopt->setVisible(false);
                    ui->cbDrvKey->setVisible(false);
                    break;
            }
            case UpdateWord :
            {
                    ui->rbNewW->setVisible(false);
                    ui->rbNewD->setVisible(false);
                    ui->cbDrvKey->setVisible(false);
                    ui->txtDrvKey->setVisible(false);
                    readword();
                    break;
            }
            case UpdateDeriv :
            {
                    ui->rbNewW->setVisible(false);
                    ui->rbNewD->setVisible(false);
                    ui->cmbAWquality->setVisible(false);
                    ui->lblQuality->setVisible(false);
                    ui->cbUpdQual->setVisible(false);
                    readderiv();
                    break;
            }
    }

    adjustSize();
}
CAddWord::~CAddWord()
{
    delete ui;
    /*dmdiw.setWidget(0);
    messages->settings().mdiArea()->removeSubWindow(&dmdiw);*/
}
//


void CAddWord::on_txtAWcopt_textChanged(QString )
{
    ui->txtAWcoptTr->setText(CTranslit::to(ui->txtAWcopt->text(),CTranslit::Copt));
}

void CAddWord::on_txtAWgr_textChanged(QString )
{
    ui->txtAWgrTr->setText(CTranslit::to(ui->txtAWgr->text(),CTranslit::Greek));
}

/*void CAddWord::on_btAWgetcrum_clicked()
{
	txtAWcrum->setText(QString::number(
		(*crum)->currentIndex()-CRUM_FIRST+3));
}*/

void CAddWord::on_btAWsave_clicked()
{
	switch (_mode)
	{
		case InsertWord :{
			int wordkey=addword();
			if(wordkey!=-1)
			{
                if(ui->rbNewW->isChecked())
				{
					clear_fields();
                    ui->txtAWcopt->setFocus();
				}
                else if(ui->rbNewD->isChecked())
				{
					*(int*)&_key=wordkey;
					*(Mode*)&_mode=InsertDeriv;
                    ui->rbNewW->setVisible(false);
                    ui->lblQuality->setVisible(false);
                    ui->cmbAWquality->setVisible(false);
					clear_fields();
                    ui->txtAWcopt->setFocus();
				}
                else if(ui->rbClose->isChecked())
                                    //messages->settings().mdiArea()->removeSubWindow(parentWidget());
                    close();
                                break;
			}
			break;
		}
		case UpdateWord :{
			updateword();
                        //messages->settings().mdiArea()->removeSubWindow(parentWidget());
            close();
			break;
		}
		case InsertDeriv :{
			addderiv();
            if(ui->rbNewD->isChecked())
			{
				clear_fields();
                ui->txtAWcopt->setFocus();
			}
            else if(ui->rbClose->isChecked())
                                //messages->settings().mdiArea()->removeSubWindow(parentWidget());
                close();
			break;
		}
		case UpdateDeriv :{
			updatederiv();
                        //messages->settings().mdiArea()->removeSubWindow(parentWidget());
            close();
			break;
		}
	}
}

int CAddWord::addword()
{
	QString query("select max(`key`) from coptwrd");
        CMySql q(query);

	messages->MsgMsg("getting next key by query "+query+" ...");
	if(!q.exec())
	{
                messages->MsgErr(q.lastError());
		return -1;
	}
	if(!q.first())
	{
		messages->MsgErr("something wrong");
		return -1;
	}
	int key=q.value(0).toInt();

        QString query2="insert into `coptwrd` (`key`,`word`,`type`,`cz`,`en`,`gr`,`crum`,`quality`,`added`,`updated`,`created_by`,`updated_by`) values ("+QString::number(++key)+",'"+ui->txtAWcopt->text()+"',"+ui->cmbAWtype->itemData(ui->cmbAWtype->currentIndex()).toString()+",'"+ui->txtAWcz->text()+"','"+ui->txtAWeng->text()+"','"+ui->txtAWgr->text()+"','"+ui->txtAWcrum->text()+(ui->rbAWA->isChecked()?"a":"b")+"',"+ui->cmbAWquality->itemData(ui->cmbAWquality->currentIndex()).toString()+",curdate(),'0','"+messages->settings().nick()+"','')";

        CMySql q2(query2);

	messages->MsgMsg(QString("inserting new word with key "+QString::number(key)+" by query "+query2+" ..."));
	if(!q2.exec())
	{
                messages->MsgErr(q2.lastError());
		return -1;
	}
	messages->MsgOk();
	return key;
}
void CAddWord::updateword()
{
        QString query("update `coptwrd` set ");

    if(ui->cbUpdCopt->isChecked())
        query.append(" `word`='"+ui->txtAWcopt->text()+"',");

    if(ui->cbUpdType->isChecked())
        query.append(" `type`="+ui->cmbAWtype->itemData(ui->cmbAWtype->currentIndex()).toString()+",");

    if(ui->cbUpdCz->isChecked())
        query.append(" `cz`='"+ui->txtAWcz->text()+"',");

    if(ui->cbUpdEn->isChecked())
        query.append(" `en`='"+ui->txtAWeng->text()+"',");

    if(ui->cbUpdGr->isChecked())
        query.append(" `gr`='"+ui->txtAWgr->text()+"',");

    if(ui->cbUpdCrum->isChecked())
                query.append(" `crum`='"+ui->txtAWcrum->text()+(ui->rbAWA->isChecked()?"a":"b")+"',");

    if(ui->cbUpdQual->isChecked())
        query.append(" `quality`="+ui->cmbAWquality->itemData(ui->cmbAWquality->currentIndex()).toString()+",");

        query.append(" `updated`=curdate(),");
        query.append(" `updated_by`='"+messages->settings().nick()+"',");

	query.chop(1);
	query.append(" where `key`="+QString::number(_key));

	messages->MsgMsg("updating word with key "+QString::number(_key)+" by query "+query+" ...");

        CMySql q(query);

	if(!q.exec())
	{
                messages->MsgErr(q.lastError());
		return;
	}

	messages->MsgOk();
}
void CAddWord::readword()
{
        QString query("select `word`,`cz`,`en`,`gr`,`crum`,`type`,`quality` from `coptwrd` where `key`="+QString::number(_key));
        CMySql q(query);

	messages->MsgMsg("reading row by query "+query+" ...");
	if(!q.exec())
	{
                messages->MsgErr(q.lastError());
		return;
	}
	if(!q.first())
	{
		messages->MsgErr("something wrong");
		return;
	}
        ui->txtAWcopt->setText(q.value(0));
        ui->txtAWcz->setText(q.value(1));
        ui->txtAWeng->setText(q.value(2));
        ui->txtAWgr->setText(q.value(3));

        QString crum(q.value(4));

    ui->rbAWB->setChecked(true);
    ui->rbAWA->setChecked(crum.right(1)=="a");
	crum.chop(1);
    ui->txtAWcrum->setText(crum);

    ui->cmbAWtype->setCurrentIndex(ui->cmbAWtype->findData(
        q.value(5).toInt()
	));
    ui->cmbAWquality->setCurrentIndex(ui->cmbAWquality->findData(
        q.value(6).toInt()
	));
	messages->MsgOk();

	on_cbUpdQual_stateChanged(0 );
	on_cbUpdCrum_stateChanged(0 );
	on_cbUpdCopt_stateChanged(0 );
	on_cbUpdCz_stateChanged(0 );
	on_cbUpdEn_stateChanged(0 );
	on_cbUpdGr_stateChanged(0 );
	on_cbUpdType_stateChanged(0 );
        on_cbDrvKey_stateChanged(0 );
}
void CAddWord::on_cbUpdType_stateChanged(int )
{
    if(ui->cbUpdType->isChecked())
        ui->cmbAWtype->setEnabled(true);
	else
        ui->cmbAWtype->setEnabled(false);
}
void CAddWord::on_cbUpdQual_stateChanged(int )
{
    if(ui->cbUpdQual->isChecked())
        ui->cmbAWquality->setEnabled(true);
	else
        ui->cmbAWquality->setEnabled(false);
}

void CAddWord::on_cbUpdCrum_stateChanged(int )
{
    if(ui->cbUpdCrum->isChecked())
	{
        ui->rbAWA->setEnabled(true);
        ui->rbAWB->setEnabled(true);
//		btAWgetcrum->setEnabled(true);
        ui->txtAWcrum->setEnabled(true);
	}
	else
	{
        ui->rbAWA->setEnabled(false);
        ui->rbAWB->setEnabled(false);
//		btAWgetcrum->setEnabled(false);
        ui->txtAWcrum->setEnabled(false);
	}
}

void CAddWord::on_cbUpdCopt_stateChanged(int )
{
    if(ui->cbUpdCopt->isChecked())
        ui->txtAWcopt->setEnabled(true);
	else
        ui->txtAWcopt->setEnabled(false);
}

void CAddWord::on_cbUpdCz_stateChanged(int )
{
    if(ui->cbUpdCz->isChecked())
        ui->txtAWcz->setEnabled(true);
	else
        ui->txtAWcz->setEnabled(false);
}

void CAddWord::on_cbUpdEn_stateChanged(int )
{
    if(ui->cbUpdEn->isChecked())
        ui->txtAWeng->setEnabled(true);
	else
        ui->txtAWeng->setEnabled(false);
}

void CAddWord::on_cbUpdGr_stateChanged(int )
{
    if(ui->cbUpdGr->isChecked())
        ui->txtAWgr->setEnabled(true);
	else
        ui->txtAWgr->setEnabled(false);
}
void CAddWord::on_cbDrvKey_stateChanged(int )
{
        if(ui->cbDrvKey->isChecked())
                ui->txtDrvKey->setEnabled(true);
        else
                ui->txtDrvKey->setEnabled(false);
}
void CAddWord::addderiv()
{
    QString query2="insert into `coptdrv` (`key_word`,`key_deriv`,`word`,`type`,`cz`,`en`,`gr`,`crum`,`added`,`updated`,`created_by`,`updated_by`) values ("+QString::number(_key)+","+ui->txtDrvKey->text()+",'"+ui->txtAWcopt->text()+"',"+ui->cmbAWtype->itemData(ui->cmbAWtype->currentIndex()).toString()+",'"+ui->txtAWcz->text()+"','"+ui->txtAWeng->text()+"','"+ui->txtAWgr->text()+"','"+ui->txtAWcrum->text()+(ui->rbAWA->isChecked()?"a":"b")+"',curdate(),'0','"+messages->settings().nick()+"','')";

        CMySql q2(query2);

	messages->MsgMsg(QString("inserting new derivation with key "+QString::number(_key)+" by query "+query2+" ..."));
	if(!q2.exec())
	{
                messages->MsgErr(q2.lastError());
		return;
	}

	messages->MsgOk();
}
void CAddWord::readderiv()
{
        QString query("select `word`,`cz`,`en`,`gr`,`crum`,`type`,`key_deriv` from `coptdrv` where `key`="+QString::number(_key));
        CMySql q(query);

	messages->MsgMsg("reading row by query "+query+" ...");
	if(!q.exec())
	{
                messages->MsgErr(q.lastError());
		return;
	}
	if(!q.first())
	{
		messages->MsgErr("something wrong");
		return;
	}
        ui->txtAWcopt->setText(q.value(0));
        ui->txtAWcz->setText(q.value(1));
        ui->txtAWeng->setText(q.value(2));
        ui->txtAWgr->setText(q.value(3));
        ui->txtDrvKey->setText(q.value(6));
        QString crum(q.value(4));

    ui->rbAWB->setChecked(true);
    ui->rbAWA->setChecked(crum.right(1)=="a");
	crum.chop(1);
    ui->txtAWcrum->setText(crum);

    ui->cmbAWtype->setCurrentIndex(ui->cmbAWtype->findData(
        q.value(5).toInt()
	));

	messages->MsgOk();

	on_cbUpdCrum_stateChanged(0 );
	on_cbUpdCopt_stateChanged(0 );
	on_cbUpdCz_stateChanged(0 );
	on_cbUpdEn_stateChanged(0 );
	on_cbUpdGr_stateChanged(0 );
	on_cbUpdType_stateChanged(0 );
        on_cbDrvKey_stateChanged(0 );
}
void CAddWord::updatederiv()
{
        QString query("update `coptdrv` set ");

    if(ui->cbUpdCopt->isChecked())
        query.append(" `word`='"+ui->txtAWcopt->text()+"',");

    if(ui->cbUpdType->isChecked())
        query.append(" `type`="+ui->cmbAWtype->itemData(ui->cmbAWtype->currentIndex()).toString()+",");

    if(ui->cbUpdCz->isChecked())
        query.append(" `cz`='"+ui->txtAWcz->text()+"',");

    if(ui->cbUpdEn->isChecked())
        query.append(" `en`='"+ui->txtAWeng->text()+"',");

    if(ui->cbUpdGr->isChecked())
        query.append(" `gr`='"+ui->txtAWgr->text()+"',");

    if(ui->cbUpdCrum->isChecked())
                query.append("`crum`='"+ui->txtAWcrum->text()+(ui->rbAWA->isChecked()?"a":"b")+"',");

        if(ui->cbDrvKey->isChecked())
                query.append(" `key_deriv`="+ui->txtDrvKey->text()+",");

        query.append("`updated`=curdate(),");
        query.append(" `updated_by`='"+messages->settings().nick()+"',");

	query.chop(1);
        query.append(" where `key`="+QString::number(_key));

	messages->MsgMsg("updating derivation with key "+QString::number(_key)+" by query "+query+" ...");

        CMySql q(query);

	if(!q.exec())
	{
                messages->MsgErr(q.lastError());
		return;
	}

	messages->MsgOk();
}

void CAddWord::clear_fields()
{
    ui->txtAWcopt->clear();
    ui->txtAWeng->clear();
    ui->txtAWgr->clear();
    ui->txtAWcz->clear();
        //txtAWcrum->clear();
    ui->cmbAWquality->setCurrentIndex(0);
    ui->cmbAWtype->setCurrentIndex(0);
        //rbAWA->setChecked(true);
}

void CAddWord::on_btEdit_clicked()
{
    dd.setText(ui->txtAWcopt->text().trimmed(),
            ui->txtAWeng->text(),ui->txtAWgr->text());
    dd.show();
    /*if(dmdiw.isVisible())
        dmdiw.raise();
    else
        dmdiw.show();*/
}
void CAddWord::ddialog_finished(int result)
{
	switch(result)
	{
		case CDialects3::Accepted :
		{
            ui->txtAWcopt->setText(dd.makeRecord());
            ui->txtAWeng->setText(dd.engText());
            ui->txtAWgr->setText(dd.greekText());
			break;
		}
		case CDialects3::Rejected :
		{
			break;
		}
	}
        //dmdiw.hide();
}


void CAddWord::on_btTemplTr_clicked()
{
    ui->cmbAWtype->setCurrentIndex(23);
    ui->txtAWeng->setText("tr :");
}

void CAddWord::on_btTemplIntrQ_clicked()
{
    ui->cmbAWtype->setCurrentIndex(23);
    ui->txtAWeng->setText("intr (qual):");
}

void CAddWord::on_btTemplIntr_clicked()
{
    ui->cmbAWtype->setCurrentIndex(23);
    ui->txtAWeng->setText("intr :");
}

void CAddWord::on_btTemplRefl_clicked()
{
    ui->txtAWeng->setText(ui->txtAWeng->text().replace(":","(refl):"));
}

void CAddWord::on_btTemplAdvb_clicked()
{
    ui->cmbAWtype->setCurrentIndex(23);
    ui->txtAWeng->setText("With following adverb:");
}

void CAddWord::on_btTemplPrep_clicked()
{
    ui->cmbAWtype->setCurrentIndex(23);
    ui->txtAWeng->setText("With following preposition:");
}
