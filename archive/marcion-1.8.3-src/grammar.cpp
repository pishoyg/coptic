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

#include "grammar.h"
#include "ui_grammar.h"
//

short CGrammar::parg[17][2]=
{
    {1,16},
    {17,34},
    {35,79},
    {80,115},
    {116,136},
    {137,145},
    {146,160},
    {161,179},
    {180,198},
    {199,224},
    {225,259},
    {260,280},
    {281,297},
    {298,336},
    {337,368},
    {369,399},
    {0,0}
};

CGrammar::CGrammar(QWidget * parent)
        : QWidget(parent),
          ui(new Ui::frmGrammar),
        find_activated(false),
        find()
{
    ui->setupUi(this);

	QStringList content_data;
	content_data << "note.htm" <<
	"introduction.htm" <<
	"alphabet.htm" <<
	"syllable.htm" <<
	"morphology_a.htm" <<
	"morphology_b.htm" <<
	"morphology_c.htm" <<
	"morphology_d.htm" <<
	"morphology_e.htm" <<
	"morphology_f.htm" <<
	"conjugation_a.htm" <<
	"conjugation_b.htm" <<
	"conjugation_c.htm" <<
	"particle_a.htm" <<
	"particle_b.htm" <<
	"syntax_a.htm" <<
        "syntax_b.htm" <<
        "syntax_c.htm" <<
	"alfa-lamda.htm" <<
	"mu-nu.htm" <<
	"xi-gima.htm" <<
	"irregular.htm" <<
	"general.htm";

    for(int x=0;x<ui->cmbContent->count();x++)
        ui->cmbContent->setItemData(x,content_data[x]);

        ui->wwGrammar->load(
        QUrl(QDir::toNativeSeparators("data/grammar/plumley/html/home.htm")));
        ui->spnZoom->setValue(ui->wwGrammar->zoomFactor());

        IC_SIZES
}

CGrammar::~CGrammar()
{
    RM_WND;
    delete ui;
}

//

void CGrammar::on_cmbContent_currentIndexChanged(int index)
{
        ui->wwGrammar->load(QUrl(QDir::toNativeSeparators("data/grammar/plumley/html/")+ui->cmbContent->itemData(index).toString()));
}

void CGrammar::on_btGo_clicked()
{
    on_cmbContent_currentIndexChanged(ui->cmbContent->currentIndex());
}

void CGrammar::on_btBack_clicked()
{
    ui->wwGrammar->back();
}

void CGrammar::on_btNext_clicked()
{
    ui->wwGrammar->forward();
}

void CGrammar::on_spnZoom_valueChanged(double newf)
{
    ui->wwGrammar->setZoomFactor(newf);
}

void CGrammar::scrollToParagraph(QString const & text,bool paragraph)
{
    QString t(text);
    QString dig(text);
    dig.remove(QRegExp("\\D"));
    if(paragraph)
    {
        short ti(dig.toShort());
        t.prepend(QString(0x00A7));

        for(int x=0;x<17;x++)
        {
            if(parg[x][0]<=ti&&parg[x][1]>=ti)
            {
                int ci(ui->cmbContent->currentIndex());
                if(x+2==ci)
                {
                    if(!ui->wwGrammar->page()->findText(t,QWebPage::FindWrapsAroundDocument))
                        QMessageBox(QMessageBox::Critical,tr("grammar | Plumley"),"text "+t+tr(" not found!"),QMessageBox::Close,this).exec();
                    return;
                }
                else
                {
                    ui->wwGrammar->stop();
                    find_activated=true;
                    find=t;
                    ui->cmbContent->setCurrentIndex(x+2);
                    return;
                }
            }
        }
    }
}

void CGrammar::on_wwGrammar_loadFinished(bool )
{
    if(find_activated)
    {
        find_activated=false;
        if(!ui->wwGrammar->page()->findText(find,QWebPage::FindWrapsAroundDocument))
            QMessageBox(QMessageBox::Critical,tr("grammar | Plumley"),"text "+find+tr(" not found!"),QMessageBox::Close,this).exec();
    }
}
