#include "mdjvureader2.h"
#include "ui_mdjvureader2.h"

MDjvuReader2::MDjvuReader2(QString const & filename) :
    QMainWindow(0),
    ui(new Ui::MDjvuReader2),
    context(0),
    djView(filename,context),
    _gk(0),_cop(0),_num(0),_heb(0)
{
    ui->setupUi(this);

    ui->wdgPanel->hide();
    init_reader(filename);

    ui->wdgHeader->initFirstButton(QIcon(":/new/icons/icons/djvu_icon.png"),tr("&document"));
    ui->wdgHeader->setStWdg(ui->stwDjvu);

    IC_SIZES
}

MDjvuReader2::~MDjvuReader2()
{
    RM_WND;

    if(_gk)
        delete _gk;
    if(_cop)
        delete _cop;
    if(_num)
        delete _num;

    delete ui;
}

//

void MDjvuReader2::init_reader(QString const & filename)
{
    djView.showToolBar(true);
    djView.showSideBar(false);

    ui->wdgLay->addWidget(&djView);
    //djView.show();
    setWindowTitle(QFileInfo(filename).fileName());
    //adjustSize();
}

void MDjvuReader2::fillContent(QList<QPair<QString,QVariant> >  const & items)
{
    for(int x=0;x<items.size();x++)
        ui->cmbContent->addItem(items[x].first,items[x].second);
    ui->cmbContent->setEnabled(true);
}

void MDjvuReader2::on_cmbContent_activated(int index)
{
    djView.goToPage(ui->cmbContent->itemData(index).toInt());
}

void MDjvuReader2::showPanel()
{
    ui->wdgPanel->show();
}

void MDjvuReader2::on_actionClose_triggered()
{
    close();
}

void MDjvuReader2::on_actionGk_Lat_dictionary_triggered()
{
    if(!_gk)
    {
        _gk=new CLSJ(m_msg());
        ui->wdgHeader->initPage(MDocHeader::GkDict,ui->stwDjvu->addWidget(_gk));
    }
    ui->wdgHeader->setDocMode(MDocHeader::GkDict);
}

void MDjvuReader2::on_actionCoptic_dictionary_triggered()
{
    if(!_cop)
    {
        _cop=new CWordPreview(m_msg());
        ui->wdgHeader->initPage(MDocHeader::CopDict,ui->stwDjvu->addWidget(_cop));
    }
    ui->wdgHeader->setDocMode(MDocHeader::CopDict);
}

void MDjvuReader2::on_actionNumeric_converter_triggered()
{
    if(!_num)
    {
        _num=new MCopticNumerals(0,true);
        ui->wdgHeader->initPage(MDocHeader::NumConv,ui->stwDjvu->addWidget(_num));
    }
    ui->wdgHeader->setDocMode(MDocHeader::NumConv);
}

void MDjvuReader2::on_action_Hebrew_dictionary_triggered()
{
    if(!_heb)
    {
        _heb=new MHebrDict();
        ui->wdgHeader->initPage(MDocHeader::HebDict,ui->stwDjvu->addWidget(_heb));
    }
    ui->wdgHeader->setDocMode(MDocHeader::HebDict);
}
